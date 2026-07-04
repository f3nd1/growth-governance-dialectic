export default function PageHeader({ title, desc }) {
  return (
    <>
      <h1>
        {title} <span className="stamp">Synthetic pilot</span>
      </h1>
      {desc && <p className="page-desc">{desc}</p>}
    </>
  )
}
