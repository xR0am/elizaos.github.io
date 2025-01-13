import { getUsers, getUserById } from "@/lib/get-users";
import UserProfile from "@/components/user-profile";
import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export function generateStaticParams() {
  const users = getUsers();
  return users.map((user) => ({
    username: user.username,
  }));
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const user = getUserById(params.username);

  if (!user) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <UserProfile {...user} />
    </main>
  );
}
