import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def create_sales_manager(name, email, phone, password):
    username = email.split('@')[0]
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'name': name,
            'phone': phone,
            'role': 'sales_manager',
            'status': True,
            'is_active': True,
        }
    )
    
    # Set password for newly created or update it for existing if needed
    user.set_password(password)
    user.save()
    
    if created:
        print(f"Successfully created Sales Manager: {email}")
    else:
        print(f"Sales Manager already exists, password updated: {email}")

def seed_sales_managers():
    print("Starting seeding process for Sales Managers...")

    # Individual user entries for easy production modification
    # Format: name, email, phone, password
    create_sales_manager("Dhaval", "dhavalchauhan@abtikservices.co.in", "8160783299", "J7W3otCb7BhQek0ceH2e")
    create_sales_manager("Vaishali", "vaishali@abtikservices.co.in", "6358193522", "moL7QZQcBws7ZXC2UALY")
    # create_sales_manager("Saurabh", "bdm3@gmail.com", "7486062028", "pXR5a612FmPp3iyNgY8B")
    # create_sales_manager("Jayveer", "bdm4@gmail.com", "9213013926", "AHMPqnXrcEUFJKuXVB0K")
    # create_sales_manager("Shruti", "bdm5@gmail.com", "6358169602", "NxE2Yrv4UcE4j0hUWPwp")
    print("Seeding process completed!")

if __name__ == "__main__":
    seed_sales_managers()
