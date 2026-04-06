from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_payment_services_alter_payment_booking'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='payment',
            name='after_fund_disbursement_remarks',
        ),
        migrations.RemoveField(
            model_name='payment',
            name='received_amount_remarks',
        ),
        migrations.RemoveField(
            model_name='payment',
            name='remaining_amount_remarks',
        ),
        migrations.RemoveField(
            model_name='payment',
            name='total_payment_remarks',
        ),
    ]
