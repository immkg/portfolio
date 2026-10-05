import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>No sheet at that number</h1>
          <p className="lede">
            That page is not in the drawing set. The <Link href="/work/">work index</Link>{" "}
            lists every project, and the <Link href="/">plot</Link> is the way in.
          </p>
        </div>
      </section>
    </main>
  );
}
