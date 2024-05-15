import { auth } from '@clerk/nextjs/server';

import { NextResponse } from 'next/server';

export default function Page() {
  const { sessionClaims } = auth();

  const firstName = sessionClaims?.fullName;
console.log(firstName);
  const primaryEmail = sessionClaims?.email;
console.log(primaryEmail)
  return (
    <div>
      {firstName}
      This is email: {primaryEmail}
    </div>
  )
}