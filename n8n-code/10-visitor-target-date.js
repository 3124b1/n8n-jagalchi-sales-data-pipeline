const yesterday = DateTime.now().minus({ days: 1 }).toFormat('yyyy-MM-dd');
return [{ json: { target_date: yesterday } }];
