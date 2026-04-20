from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('saas', '0023_prompt_is_default_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='description',
            field=models.TextField(blank=True, help_text='Дополнительное описание (парсится отдельно)'),
        ),
    ]
