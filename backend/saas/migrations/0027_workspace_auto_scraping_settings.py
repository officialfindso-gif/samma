from django.db import migrations, models


def copy_system_settings_to_workspaces(apps, schema_editor):
    Workspace = apps.get_model('saas', 'Workspace')
    SystemSettings = apps.get_model('saas', 'SystemSettings')

    settings = SystemSettings.objects.order_by('pk').first()
    if settings is None:
        return

    Workspace.objects.all().update(
        auto_scraping_enabled=settings.auto_scraping_enabled,
        scraping_hour=settings.scraping_hour,
        scraping_minute=settings.scraping_minute,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('saas', '0026_userlicense'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspace',
            name='auto_scraping_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='workspace',
            name='last_auto_scrape_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='workspace',
            name='scraping_hour',
            field=models.IntegerField(default=9),
        ),
        migrations.AddField(
            model_name='workspace',
            name='scraping_minute',
            field=models.IntegerField(default=0),
        ),
        migrations.RunPython(
            copy_system_settings_to_workspaces,
            migrations.RunPython.noop,
        ),
    ]
