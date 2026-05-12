interface ProfileSnapshot {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  dateOfBirth: Date | null;
  address: string | null;
}

const FIELDS: (keyof ProfileSnapshot)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "position",
  "dateOfBirth",
  "address",
];

export function computeCandidateCompletion(profile: ProfileSnapshot): number {
  const filled = FIELDS.filter((f) => {
    const v = profile[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((filled / FIELDS.length) * 100);
}
