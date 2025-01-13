import { getUsers, getUserById } from "@/lib/get-users";
import UserProfile from "@/components/user-profile";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateStaticParams() {
  const users = await getUsers();
  return (users || []).map((user) => ({
    username: user.username,
  }));
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserById(username);
  return {
    title: user
      ? `${user.username}'s Eliza Contributer Profile`
      : "Profile Not Found",
    description: user?.summary || "Eliza contributor profile",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
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