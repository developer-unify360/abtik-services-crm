import uuid

from django.db import migrations, models
import django.db.models.deletion

import payments.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('attributes', '0002_paymenttype'),
        ('bookings', '0005_alter_booking_payment_type'),
        ('clients', '0003_alter_client_industry'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('source', models.CharField(choices=[('booking', 'Booking'), ('manual', 'Manual')], default='manual', max_length=20)),
                ('client_name', models.CharField(blank=True, max_length=255)),
                ('company_name', models.CharField(blank=True, max_length=255)),
                ('gst_pan', models.CharField(blank=True, max_length=50)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('mobile', models.CharField(blank=True, max_length=20)),
                ('reference_number', models.CharField(blank=True, max_length=100)),
                ('payment_date', models.DateField(blank=True, null=True)),
                ('total_payment_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('total_payment_remarks', models.TextField(blank=True)),
                ('received_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('received_amount_remarks', models.TextField(blank=True)),
                ('remaining_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('remaining_amount_remarks', models.TextField(blank=True)),
                ('after_fund_disbursement_percentage', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('after_fund_disbursement_remarks', models.TextField(blank=True)),
                ('attachment', models.FileField(blank=True, null=True, upload_to=payments.models.payment_attachment_upload_to)),
                ('remarks', models.TextField(blank=True)),
                ('bank', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='bookings.bank')),
                ('booking', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payment_record', to='bookings.booking')),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='clients.client')),
                ('payment_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='attributes.paymenttype')),
            ],
            options={
                'ordering': ['-payment_date', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['source'], name='idx_payment_source'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['payment_date'], name='idx_payment_date'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['client_name'], name='idx_payment_client_name'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['company_name'], name='idx_payment_company_name'),
        ),
    ]
