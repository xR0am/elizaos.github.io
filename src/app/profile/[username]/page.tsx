import { getUsers, getUserById } from "@/lib/get-users";
import UserProfile from "@/components/user-profile";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// This is required for static site generation with dynamic routes
export async function generateStaticParams() {
  const users = await getUsers();
  return users.map((user) => ({
    username: user.username,
  }));
}

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserById(username);
  return {
    title: user
      ? `${user.username}'s Eliza Contributer Profile`
      : "Profile Not Found",
    description: user?.summary || "Eliza contributor profile",
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const user = await getUserById(username);

  if (!user) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <UserProfile {...user} />
    </main>
  );
}