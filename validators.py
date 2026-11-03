import re
from datetime import date, datetime


SPECIES = {"Dog", "Cat", "Rabbit", "Bird", "Other"}
GENDERS = {"Male", "Female"}
VISIT_TYPES = {
    "Annual checkup",
    "Vaccination booster",
    "Surgery follow-up",
    "Spay/Neuter",
    "Consultation",
    "Emergency",
}


def _text(value):
    return str(value or "").strip()


def _valid_date(value, field_name, required):
    value = _text(value)
    if not value:
        return f"{field_name} is required." if required else ""
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return f"Enter a valid {field_name.lower()} in YYYY-MM-DD format."
    if parsed.isoformat() != value:
        return f"Enter a valid {field_name.lower()} in YYYY-MM-DD format."
    if parsed > date.today():
        return f"{field_name} cannot be in the future."
    return ""


def _valid_name(value, field_name, minimum, maximum):
    value = _text(value)
    if not value:
        return f"{field_name} is required."
    if not minimum <= len(value) <= maximum or not re.fullmatch(r"[A-Za-z][A-Za-z '\-]*", value):
        return f"Enter {minimum}-{maximum} letters, spaces, hyphens or apostrophes, starting with a letter."
    return ""


def _valid_email(value):
    email = _text(value)
    if not email:
        return "Email address is required."
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return "Enter a valid email address."
    return ""


def _valid_phone(value):
    phone = re.sub(r"\s", "", _text(value))
    if not phone:
        return "Phone number is required."
    if not re.fullmatch(r"(?:0\d{9}|\+27\d{9})", phone):
        return "Enter a South African number: 10 digits starting with 0 or +27 followed by 9 digits."
    return ""


def _valid_boolean(value):
    if isinstance(value, bool):
        return True
    return str(value).strip().lower() in {"yes", "no", "true", "false", "1", "0"}


def validate_patient(data):
    errors = {}
    pet_name = _valid_name(data.get("pet_name"), "Pet name", 2, 40)
    if pet_name:
        errors["pet_name"] = pet_name

    species = _text(data.get("species"))
    if species not in SPECIES:
        errors["species"] = "Choose Dog, Cat, Rabbit, Bird or Other."

    breed = _text(data.get("breed"))
    if len(breed) > 40:
        errors["breed"] = "Breed must be 40 characters or fewer."

    dob_error = _valid_date(data.get("dob"), "Date of birth", required=False)
    if dob_error:
        errors["dob"] = dob_error

    gender = _text(data.get("gender"))
    if gender not in GENDERS:
        errors["gender"] = "Choose Male or Female."

    if not _valid_boolean(data.get("neutered_spayed")):
        errors["neutered_spayed"] = "Choose yes or no for neutered/spayed."

    owner_name = _valid_name(data.get("owner_name"), "Owner full name", 2, 60)
    if owner_name:
        errors["owner_name"] = owner_name

    email_error = _valid_email(data.get("email"))
    if email_error:
        errors["email"] = email_error

    phone_error = _valid_phone(data.get("phone"))
    if phone_error:
        errors["phone"] = phone_error

    return errors


def validate_visit(data):
    errors = {}
    try:
        if int(data.get("patient_id")) < 1:
            raise ValueError
    except (TypeError, ValueError):
        errors["patient_id"] = "Select an existing patient."

    date_error = _valid_date(data.get("date"), "Visit date", required=True)
    if date_error:
        errors["date"] = date_error

    visit_type = _text(data.get("visit_type"))
    if visit_type not in VISIT_TYPES:
        errors["visit_type"] = "Choose a valid visit type."

    notes = _text(data.get("notes"))
    if len(notes) > 200:
        errors["notes"] = "Notes must be 200 characters or fewer."

    staff_name = _text(data.get("staff_name"))
    if not 2 <= len(staff_name) <= 60:
        errors["staff_name"] = "Staff name must be between 2 and 60 characters."

    time_value = _text(data.get("time"))
    try:
        datetime.strptime(time_value, "%H:%M")
    except ValueError:
        errors["time"] = "Enter a valid visit time in HH:MM format."

    return errors
