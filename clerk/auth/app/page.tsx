import { auth } from '@clerk/nextjs/server';


export default function Page() {
  const { sessionClaims } = auth();

  const firstName: string | undefined = sessionClaims?.fullName as string;
console.log(firstName);
  const primaryEmail: string | undefined = sessionClaims?.email as string;
console.log(primaryEmail)
  return (
    <div>
      {firstName}
      This is email for the signed in user: {primaryEmail}
    </div>
  )
}