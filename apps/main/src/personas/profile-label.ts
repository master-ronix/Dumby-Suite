/**
 * The resident bot's profile id — a FRAMEWORK constant, and the only thing left in this file.
 *
 * UR-20261030-118 — what a profile is CALLED was the persona module's knowledge, and it moved to
 * `packages/modules/persona/src/services/persona-directory.ts`. The core resolves it through
 * `ModuleServiceRegistry` under `core.PersonaDirectory`. What stays here is the sentinel id itself: the
 * framework keys its own resident profile by it in a dozen places, and a persona id is a UUID that can
 * never collide with it.
 */
export const MAIN_PROFILE_ID = 'main';
