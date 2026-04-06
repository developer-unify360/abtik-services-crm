import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_fake_state'),
        ('services', '0006_rename_and_delete'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='services',
            field=models.ManyToManyField(blank=True, related_name='payments', to='services.service'),
        ),
        migrations.RunSQL(
            sql='DROP INDEX IF EXISTS "payments_payment_booking_id_2a46974b";',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name='payment',
            name='booking',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='bookings.booking'),
        ),
    ]
