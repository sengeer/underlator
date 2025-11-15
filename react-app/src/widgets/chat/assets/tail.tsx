export default function Tail({ color, style }: Icon) {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      style={style}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'>
      <path d='M24.001 0L0 24.001V0H2V19.1729L21.1729 0H24.001Z' fill={color} />
    </svg>
  );
}
