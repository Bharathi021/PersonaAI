import re


def mask_sensitive_text(text: str) -> str:
    email_pattern = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
    phone_pattern = r"(?:\\+?\\d{1,3}[ -]?)?(?:\\d[ -]?){9,12}"

    masked = re.sub(email_pattern, "[email-masked]", text)
    masked = re.sub(phone_pattern, "[phone-masked]", masked)

    lines = []
    for line in masked.splitlines():
        if any(keyword in line.lower() for keyword in ["address", "dob", "passport"]):
            lines.append("[sensitive-line-masked]")
        else:
            lines.append(line)
    return "\\n".join(lines)
