import CompanionKonfirmasiPage from "../page";

export default async function CompanionKonfirmasiVisitRoute({
  params,
}: {
  params: Promise<{ linkId: string; visitId: string }>;
}) {
  const { linkId, visitId } = await params;
  return (
    <CompanionKonfirmasiPage
      params={Promise.resolve({ linkId })}
      searchParams={Promise.resolve({ visitId })}
    />
  );
}
