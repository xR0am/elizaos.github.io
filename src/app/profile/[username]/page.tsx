import { getUsers, getUserById } from "@/lib/get-users";
import UserProfile from "@/components/user-profile";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type ProfilePageProps = {
  params: { username: string };
};

// This is required for static site generation with dynamic routes
export async function generateStaticParams(): Promise<Array<{ username: string }>> {
  const users = await getUsers();
  return users.map((user) => ({
    username: user.username,
  }));
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const user = await getUserById(params.username);
  return {
    title: user
      ? `${user.username}'s Eliza Contributer Profile`
      : "Profile Not Found",
    description: user?.summary || "Eliza contributor profile",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const user = await getUserById(params.username);

  if (!user) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <UserProfile {...user} />
    </main>
  );
}