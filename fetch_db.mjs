async function run() {
	try {
		console.log("Fetching user...");
		const userRes = await fetch("http://127.0.0.1:8080/v1/projects/demo-sstracker/databases/(default)/documents/users/ecwaechtler%2Bcoach@gmail.com");
		const user = await userRes.json();
		console.log("USER:", JSON.stringify(user, null, 2));

		console.log("Fetching teams...");
		const teamsRes = await fetch("http://127.0.0.1:8080/v1/projects/demo-sstracker/databases/(default)/documents/teams");
		const teams = await teamsRes.json();
		
		let aggiesTeam = null;
		let wrongTeam = null;

		for (const doc of (teams.documents || [])) {
			const data = doc.fields;
			const name = data.name?.stringValue || data.teamName?.stringValue || '';
			console.log(`TEAM ${doc.name}: ${name}`);
			
			if (name.includes('Aggies')) {
				aggiesTeam = doc;
			}
			if (name.includes('2016')) {
				wrongTeam = doc;
			}
		}

		console.log("Found Aggies Team:", aggiesTeam ? aggiesTeam.name : "None");
		console.log("Found Wrong Team:", wrongTeam ? wrongTeam.name : "None");

	} catch (e) {
		console.error(e);
	}
}

run();
