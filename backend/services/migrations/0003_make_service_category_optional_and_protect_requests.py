import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0002_servicerequest_created_by'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='category',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='services',
                to='services.servicecategory',
            ),
        ),
        migrations.AlterField(
            model_name='servicerequest',
            name='service',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='requests',
                to='services.service',
            ),
        ),
    ]
