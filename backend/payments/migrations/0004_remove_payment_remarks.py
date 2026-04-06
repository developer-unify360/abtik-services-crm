from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_remove_remarks_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='payment',
            name='remarks',
        ),
    ]
