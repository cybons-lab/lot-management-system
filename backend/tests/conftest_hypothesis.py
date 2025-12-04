import os

from hypothesis import HealthCheck, settings


# Define CI profile
settings.register_profile(
    "ci",
    max_examples=10,  # Reduce examples for CI speed
    deadline=None,  # Disable deadline for CI
    suppress_health_check=[HealthCheck.too_slow],
)

# Define dev profile
settings.register_profile(
    "dev",
    max_examples=10,
    deadline=None,
)

# Load profile based on env or default to dev
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))
