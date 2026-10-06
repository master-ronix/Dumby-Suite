export type Token<T> = symbol & { readonly __tokenType?: T };

export function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

export function tokenName(token: symbol): string {
  return token.description ?? token.toString();
}

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type Factory<T> = (container: Container) => T;

interface Registration<T> {
  factory: Factory<T>;
  lifetime: Lifetime;
}

export interface RegisterOptions {
  lifetime?: Lifetime;
}

export class CircularDependencyError extends Error {
  constructor(readonly chain: readonly string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class TokenNotRegisteredError extends Error {
  constructor(readonly token: string) {
    super(`Token not registered: ${token}`);
    this.name = 'TokenNotRegisteredError';
  }
}

export class FrozenNamespaceError extends Error {
  constructor(readonly token: string) {
    super(`Cannot register "${token}": container namespace is frozen`);
    this.name = 'FrozenNamespaceError';
  }
}

export class Container {
  private readonly registrations = new Map<symbol, Registration<unknown>>();
  private readonly singletonCache = new Map<symbol, unknown>();
  private readonly scopedCache = new Map<symbol, unknown>();
  private frozen = false;
  private readonly root: Container;
  private readonly resolutionStack: symbol[];
  private readonly parent: Container | null;

  constructor(parent: Container | null = null) {
    this.parent = parent;
    this.root = parent ? parent.root : this;
    this.resolutionStack = this.root === this ? [] : this.root.resolutionStack;
  }

  register<T>(token: Token<T>, factory: Factory<T>, options: RegisterOptions = {}): this {
    if (this.frozen) {
      throw new FrozenNamespaceError(tokenName(token));
    }
    this.registrations.set(token, {
      factory: factory as Factory<unknown>,
      lifetime: options.lifetime ?? 'singleton',
    });
    this.singletonCache.delete(token);
    this.scopedCache.delete(token);
    return this;
  }

  registerValue<T>(token: Token<T>, value: T): this {
    return this.register(token, () => value, { lifetime: 'singleton' });
  }

  has(token: Token<unknown>): boolean {
    return this.findOwner(token) !== null;
  }

  freeze(): void {
    this.frozen = true;
  }

  isFrozen(): boolean {
    return this.frozen;
  }

  createChild(): Container {
    return new Container(this);
  }

  createScope(): Container {
    return new Container(this);
  }

  resolve<T>(token: Token<T>): T {
    const key = token as symbol;
    if (this.resolutionStack.includes(key)) {
      const chain = [...this.resolutionStack, key].map(tokenName);
      throw new CircularDependencyError(chain);
    }

    const owner = this.findOwner(token);
    if (!owner) {
      throw new TokenNotRegisteredError(tokenName(token));
    }
    const registration = owner.registrations.get(key) as Registration<T>;

    if (registration.lifetime === 'singleton' && owner.singletonCache.has(key)) {
      return owner.singletonCache.get(key) as T;
    }
    if (registration.lifetime === 'scoped' && this.scopedCache.has(key)) {
      return this.scopedCache.get(key) as T;
    }

    this.resolutionStack.push(key);
    let instance: T;
    try {
      instance = registration.factory(this) as T;
    } finally {
      this.resolutionStack.pop();
    }

    if (registration.lifetime === 'singleton') {
      owner.singletonCache.set(key, instance);
    } else if (registration.lifetime === 'scoped') {
      this.scopedCache.set(key, instance);
    }
    return instance;
  }

  tryResolve<T>(token: Token<T>): T | undefined {
    try {
      return this.resolve(token);
    } catch (err) {
      if (err instanceof TokenNotRegisteredError) return undefined;
      throw err;
    }
  }

  private findOwner(token: Token<unknown>): Container | null {
    if (this.registrations.has(token as symbol)) return this;
    return this.parent ? this.parent.findOwner(token) : null;
  }
}
