export function getOriginIcon(origin?: string): string {
  if (!origin) return '🌐';
  const key = String(origin).trim().toLowerCase();
  const icons: { [key: string]: string } = {
    australia: '🇦🇺',
    'south korea': '🇰🇷',
    korea: '🇰🇷',
    japan: '🇯🇵',
    italy: '🇮🇹',
    uk: '🇬🇧',
    'united kingdom': '🇬🇧',
    france: '🇫🇷',
    switzerland: '🇨🇭',
    spain: '🇪🇸',
    germany: '🇩🇪',
    usa: '🇺🇸',
    us: '🇺🇸',
    'united states': '🇺🇸',
    'united states of america': '🇺🇸',
  };
  if (icons[key]) return icons[key];
  if (key.includes('korea')) return '🇰🇷';
  if (key.includes('america') || key === 'us' || key === 'usa') return '🇺🇸';
  if (key.includes('uk') || key.includes('britain') || key.includes('england')) return '🇬🇧';
  if (key.includes('china')) return '🇨🇳';
  if (key.includes('japan')) return '🇯🇵';
  if (key.includes('germany')) return '🇩🇪';
  if (key.includes('france')) return '🇫🇷';
  if (key.includes('spain')) return '🇪🇸';
  if (key.includes('italy')) return '🇮🇹';
  if (key.includes('switzerland')) return '🇨🇭';
  if (key.includes('australia')) return '🇦🇺';
  return '🌐';
}
