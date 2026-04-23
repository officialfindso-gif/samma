from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('saas', '0023_post_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='generated_original',
            field=models.TextField(blank=True),
        ),
    ]

