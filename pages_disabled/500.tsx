export default function FiveHundred() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>服务器错误 (500)</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>抱歉，服务器出现错误，请稍后再试。</p>
      </div>
    </div>
  )
}

export async function getServerSideProps() {
  return { props: {} }
}
