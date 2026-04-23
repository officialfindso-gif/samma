from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('saas', '0024_post_generated_original'),
    ]

    operations = [
        migrations.AlterField(
            model_name='prompt',
            name='type',
            field=models.CharField(
                choices=[
                    ('caption', 'Caption'),
                    ('script', 'Script'),
                    ('title', 'Title'),
                    ('description', 'Description'),
                    ('original', 'Original'),
                    ('other', 'Other'),
                ],
                default='caption',
                max_length=20,
            ),
        ),
    ]

