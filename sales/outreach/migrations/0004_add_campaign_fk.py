from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("outreach", "0003_outreach_uniq_outreach_company_contact"),
    ]

    operations = [
        migrations.AddField(
            model_name="outreach",
            name="campaign",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="outreaches",
                to="campaigns.campaign",
            ),
        ),
    ]
