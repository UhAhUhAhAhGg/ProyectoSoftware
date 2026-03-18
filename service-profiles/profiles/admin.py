from django.contrib import admin
from .models import AdminProfile, BuyerProfile, PromotorProfile


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'employee_code', 'department')
    list_filter = ('department',)
    search_fields = ('employee_code', 'department')


@admin.register(BuyerProfile)
class BuyerProfileAdmin(admin.ModelAdmin):
    list_display = ('user_id',)
    search_fields = ('user_id',)


@admin.register(PromotorProfile)
class PromotorProfileAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'company_name', 'comercial_nit')
    search_fields = ('company_name', 'comercial_nit')
    ordering = ('company_name',)