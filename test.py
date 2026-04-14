import sys, traceback; from pathlib import Path; project_root = Path('c:/Users/user/Desktop/SalesAuto/sales/manage.py').resolve().parent.parent; sys.path.insert(0, str(project_root)); import sales; print('sales __file__:', getattr(sales, '__file__', None)); print('sales __path__:', getattr(sales, '__path__', None));
try:
  import sales.companies; print('success!')
except Exception as e:
  traceback.print_exc()
