export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Create Account</h1>

      <div className="space-y-4">
        <input
          className="w-full border p-2 rounded"
          placeholder="Full Name"
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Password"
          type="password"
        />

        <button className="w-full bg-black text-white py-2 rounded">
          Sign Up
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        Authentication will be connected later.
      </p>
    </div>
  )
}