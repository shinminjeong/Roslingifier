from import_export import resources
from .models import Employee

class EmployeeResource(resources.ModelResource):
    class Meta:
        model = Employee
