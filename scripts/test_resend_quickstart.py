import resend

# IMPORTANT: Replace 're_xxxxxxxxx' with your real Resend API key from https://resend.com/api-keys
resend.api_key = "re_xxxxxxxxx"

if __name__ == "__main__":
    if resend.api_key == "re_xxxxxxxxx":
        print("\n" + "=" * 65)
        print(" ACTION REQUIRED: Please replace 're_xxxxxxxxx' with your real")
        print(" Resend API key in this script or configure backend/.env")
        print("=" * 65 + "\n")
    else:
        try:
            r = resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": "gadwaytech@gmail.com",
                "subject": "Hello World",
                "html": "<p>Congrats on sending your <strong>first email</strong>!</p>"
            })
            print(f"✓ Email sent successfully! Response: {r}")
        except Exception as e:
            print(f"❌ Failed to dispatch email via Resend: {e}")
