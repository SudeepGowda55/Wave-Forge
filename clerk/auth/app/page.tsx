import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';


export default function Page() {
  const { sessionClaims } = auth();

  const firstname: string | undefined = sessionClaims?.fullName as string;
console.log(firstname);
  const usermail: string | undefined = sessionClaims?.email as string;
console.log(usermail)
  const username: string | undefined = sessionClaims?.fullName as string;
console.log(username)
const lastname: string | undefined = sessionClaims?.lastname as string;
console.log(lastname)
const password: string | undefined = sessionClaims?.fullName as string;
console.log(password)
  return (
    <div>
      {firstname}
  <p> This is firstname for the signed in user: {firstname}</p>   
   <p>This is usermail for the signed in user: {usermail}</p>    
    <p> This is username for the signed in user: {username}</p>  
   <p>This is lastname for the signed in user: {lastname}</p>    
   <p>This is password for the signed in user: {password}</p>    
      <Link href="/upload">GO to upload page</Link>
    </div>
  )
}