// src/app/page.js

export default function Home() {
  return (
    <main>
      <h1>Welcome to My Video App</h1>
      <p>Upload a video to concatenate with a static image.</p>
      <form
        action="/api/concat-video"
        method="post"
        encType="multipart/form-data"
      >
        <input type="file" name="video" accept="video/*" />
        <button type="submit">Upload and Process Video</button>
      </form>
    </main>
  );
}
