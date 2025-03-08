export default function SyncIconXS({
  color,
  style,
}: {
  color: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      style={style}
      width='24'
      height='24'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M3.00147 7.00049L8.00147 2.00049L13.0015 7.00049L11.6015 8.42549L9.00147 5.82549V21.0005H7.00147V5.82549L4.40147 8.42549L3.00147 7.00049ZM11.0015 17.0005L12.4015 15.5755L15.0015 18.1755V3.00049H17.0015V18.1755L19.6015 15.5755L21.0015 17.0005L16.0015 22.0005L11.0015 17.0005Z'
        fill={color}
      />
    </svg>
  );
}
