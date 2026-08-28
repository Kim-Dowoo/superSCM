export default function EmptyValue({ reasonCode }: { reasonCode: string }) {
  return <span className="empty-value">— + <code>{reasonCode}</code></span>;
}
