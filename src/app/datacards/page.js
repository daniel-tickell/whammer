import { DatacardsClient } from './DatacardsClient';

export default async function DatacardsPage({ searchParams }) {
  const params = await searchParams;
  return (
    <DatacardsClient
      initialFaction={params.faction || ''}
      initialUnits={params.units || ''}
      initialHeaderColor={params.headerColor || '#456664'}
      initialBannerColor={params.bannerColor || '#103344'}
    />
  );
}
