from django.db import migrations, models

import services.models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0004_it_delivery_and_document_portals'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clientdocumentsubmission',
            name='file',
            field=models.FileField(max_length=255, upload_to=services.models.client_document_upload_to),
        ),
    ]
