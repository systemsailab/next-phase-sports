import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-2xl",
          },
        }}
      />
    </div>
  );
}
