from django.contrib import admin
from training.models import TrainingVariant, WeekSchedule, DaySchedule, DayContent


admin.site.register(TrainingVariant)
admin.site.register(WeekSchedule)
admin.site.register(DaySchedule)
admin.site.register(DayContent)