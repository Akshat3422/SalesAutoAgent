from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0002_alter_company_options_company_ai_recommendations_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="campaign",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="companies",
                to="campaigns.campaign",
            ),
        ),
    ]
