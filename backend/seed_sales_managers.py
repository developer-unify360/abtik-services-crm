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
    create_sales_manager("bdm1", "bdm1@gmail.com", "9100000001", "password123")
    create_sales_manager("bdm2", "bdm2@gmail.com", "9100000002", "password123")
    create_sales_manager("bdm3", "bdm3@gmail.com", "9100000003", "password123")
    create_sales_manager("bdm4", "bdm4@gmail.com", "9100000004", "password123")
    create_sales_manager("bdm5", "bdm5@gmail.com", "9100000005", "password123")
    create_sales_manager("bdm6", "bdm6@gmail.com", "9100000006", "password123")
    create_sales_manager("bdm7", "bdm7@gmail.com", "9100000007", "password123")
    create_sales_manager("bdm8", "bdm8@gmail.com", "9100000008", "password123")

    print("Seeding process completed!")

if __name__ == "__main__":
    seed_sales_managers()
