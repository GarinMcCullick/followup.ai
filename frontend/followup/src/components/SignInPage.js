import React from "react";
import { GoogleLogin } from "@react-oauth/google";

const SignInPage = () => {
  const handleLoginSuccess = (response) => {
    const token = response.credential;

    // Send the token to Flask backend for authentication
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          console.log("User authenticated", data.user);
          // Redirect to dashboard or another page after successful login
        }
      })
      .catch((error) => {
        console.error("Login failed", error);
      });
  };

  const handleLoginFailure = (error) => {
    console.error("Login failed", error);
  };

  return (
    <div>
      <h2>Sign In</h2>
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={handleLoginFailure}
      />
    </div>
  );
};

export default SignInPage;
