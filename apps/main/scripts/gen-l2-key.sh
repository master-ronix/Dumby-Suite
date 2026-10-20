#!/usr/bin/env bash
# UR-20261019-103 — generate the Ed25519 keypair for the mandatory L2 build signature, and print the
# three Railway variables (single-line PEMs with escaped newlines, the form normalizeSigningKey reads).
#   BUILD_SIGNING_KEY_ID      — same id on the signer (Swastik) and the verifier (the bot)
#   BUILD_SIGNING_PRIVATE_KEY — the promotion signs with this
#   BUILD_SIGNING_PUBLIC_KEY  — the bot verifies with this
set -euo pipefail
dir="${1:-.}"
priv="$dir/build-signing.pem"
pub="$dir/build-signing.pub.pem"
openssl genpkey -algorithm ED25519 -out "$priv"
openssl pkey -in "$priv" -pubout -out "$pub"
one() { awk 'NF { sub(/\r/, ""); printf "%s\\n", $0 }' "$1"; }
printf 'Wrote %s and %s\n\nSet these Railway variables:\n\n' "$priv" "$pub"
printf 'BUILD_SIGNING_KEY_ID=build-signing-%s\n' "$(date +%Y%m%d)"
printf 'BUILD_SIGNING_PRIVATE_KEY=%s\n' "$(one "$priv")"
printf 'BUILD_SIGNING_PUBLIC_KEY=%s\n' "$(one "$pub")"
