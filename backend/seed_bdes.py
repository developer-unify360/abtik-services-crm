import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def create_bde(name, email, phone):
    username = email.split('@')[0]
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'name': name,
            'phone': phone,
            'role': 'bde',
            'status': True,
            'is_active': True,
        }
    )
    if created:
        user.set_password('password123')
        user.save()
        print(f"Successfully created BDE: {email}")
    else:
        print(f"BDE already exists: {email}")

def seed_bdes():
    print("Starting seeding process for BDEs...")

    # Individual user entries for easy production modification
    create_bde(name="Vidit", email="vidit.agrawal@abtikservices.co.in", phone="6358169595")
    create_bde(name="Nisha", email="nisha.rathore@abtikservices.co.in", phone="9213014003")
    # create_bde(name="bde3", email="bde3@gmail.com", phone="9000000003")
    # create_bde(name="bde4", email="bde4@gmail.com", phone="9000000004")
    # create_bde(name="bde5", email="bde5@gmail.com", phone="9000000005")
    # create_bde(name="bde6", email="bde6@gmail.com", phone="9000000006")
    # create_bde(name="bde7", email="bde7@gmail.com", phone="9000000007")
    # create_bde(name="bde8", email="bde8@gmail.com", phone="9000000008")
    # create_bde(name="bde9", email="bde9@gmail.com", phone="9000000009")
    # create_bde(name="bde10", email="bde10@gmail.com", phone="9000000010")
    # create_bde(name="bde11", email="bde11@gmail.com", phone="9000000011")
    # create_bde(name="bde12", email="bde12@gmail.com", phone="9000000012")
    # create_bde(name="bde13", email="bde13@gmail.com", phone="9000000013")
    # create_bde(name="bde14", email="bde14@gmail.com", phone="9000000014")
    # create_bde(name="bde15", email="bde15@gmail.com", phone="9000000015")
    # create_bde(name="bde16", email="bde16@gmail.com", phone="9000000016")
    # create_bde(name="bde17", email="bde17@gmail.com", phone="9000000017")
    # create_bde(name="bde18", email="bde18@gmail.com", phone="9000000018")
    # create_bde(name="bde19", email="bde19@gmail.com", phone="9000000019")
    # create_bde(name="bde20", email="bde20@gmail.com", phone="9000000020")
    # create_bde(name="bde21", email="bde21@gmail.com", phone="9000000021")
    # create_bde(name="bde22", email="bde22@gmail.com", phone="9000000022")
    # create_bde(name="bde23", email="bde23@gmail.com", phone="9000000023")
    # create_bde(name="bde24", email="bde24@gmail.com", phone="9000000024")

    print("Seeding process completed!")

if __name__ == "__main__":
    seed_bdes()
