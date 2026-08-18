with open("src/lib/components/recruiter/RecruiterSearchEngine.svelte", "r") as f:
    content = f.read()

import re

# We need to make sure that cursor pagination is correctly implemented using startAfter and limit(20)

old_str = """			if (ag && pos) {
				q = query(
					col,
					where('ageGroup', '==', ag),
					where('position', '==', pos),
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(20),
				);
			} else if (ag) {
				q = query(
					col,
					where('ageGroup', '==', ag),
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(20),
				);
			} else if (pos) {
				q = query(
					col,
					where('position', '==', pos),
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(20),
				);
			} else {
				q = query(
					col,
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(20),
				);
			}"""

new_str = """			let constraints = [];
			if (ag) constraints.push(where('ageGroup', '==', ag));
			if (pos) constraints.push(where('position', '==', pos));
			constraints.push(where('current_level', '>=', min));
			constraints.push(orderBy('current_level', 'desc'));
			if (lastDoc) constraints.push(startAfter(lastDoc));
			constraints.push(limit(20));
			q = query(col, ...constraints);"""

content = content.replace(old_str, new_str)

with open("src/lib/components/recruiter/RecruiterSearchEngine.svelte", "w") as f:
    f.write(content)
