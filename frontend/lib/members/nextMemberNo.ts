// "M-0001" style auto-suggest for the next member number. Parses the
// trailing numeric run of the most recently created member's number and
// increments it, preserving the prefix and zero-padding width.
export function suggestNextMemberNo(lastMemberNo: string | null | undefined): string {
  if (!lastMemberNo) return "M-0001";
  const match = lastMemberNo.match(/^(.*?)(\d+)$/);
  if (!match) return "M-0001";
  const [, prefix, digits] = match;
  const next = (parseInt(digits, 10) + 1).toString().padStart(digits.length, "0");
  return `${prefix}${next}`;
}
