import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClassWorkView } from "@/components/classwork/class-work-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("classwork.classWork");
  return { title: t("title"), robots: { index: false } };
}

export default async function ClassWorkPage({ params }: { params: Params }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <ClassWorkView assignmentId={id} />
    </main>
  );
}
