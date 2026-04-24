from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('saas', '0025_alter_prompt_type_add_original'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserLicense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('license_start_date', models.DateField(blank=True, null=True)),
                ('license_end_date', models.DateField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='license', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Лицензия пользователя',
                'verbose_name_plural': 'Лицензии пользователей',
            },
        ),
    ]

