#{api_secret: "deez", creator_address: "DMS48JcWFuxzfm6xHvs1B89UhAfbdwUTzP",…}
# api_secret
# : 
# "deez"
# creator_address
# : 
# "DMS48JcWFuxzfm6xHvs1B89UhAfbdwUTzP"
# creator_signature
# : 
#"70736274ff01005500000000015ceadf1a0f004c656088cc0e866de74fa2118558c0f1abaa786fe210556724510000000000ffffffff0100e1f505000000001976a914b2b711d2a47aa206c82699ac0b8bb945276fca7a88ac000000000001005600000000010000000000000000000000000000000000000000000000000000000000000000000000000100ffffffff0100e1f505000000001976a914b2b711d2a47aa206c82699ac0b8bb945276fca7a88ac0000000001012200e1f505000000001976a914b2b711d2a47aa206c82699ac0b8bb945276fca7a88ac01076b483045022100ca23436d9a07d7a03917f8ac9ba967f01fd75b62d92aa813fad8e93aaa41aa4a02200ffd1d12fda9739c0ffe312b2e5728befcf0f54e33b6b1198fed83c4516c4c3a0121030210bc0e32a9456122954e12654ed66ed41815edf5eb17a8cf194ca201235c630000"
# inscriptions
# : 
# [{id: "661b160c79e2c20f120c03b92fc0247a597ac7607dcb0ffb06062ab4eebf7742i0",…},…]
# slug
#: 
# "pixel-bosu"
# 
# 
# 
# 


API_URL = "https://turbo.ordinalswallet.com"


async def update_collection(api_secret, slug, name=None, icon_inscription_id=None, icon=None, active=None, description=None, inscriptions=None, socials=None, remove_icon_inscription_id=None, new_inscription_ids=None, new_inscriptions=None):
    url = f"{API_URL}/collection/update"
    payload = {
        "api_secret": api_secret,  # Secret key for API authentication
        "slug": slug  # Unique identifier for the collection
    }
    
    # Add optional parameters if they are provided

    if new_inscriptions is not None:
        payload["new_inscriptions"] = new_inscriptions  # Add new inscriptions with metadata

Update a collection
POST
 https://turbo.ordinalswallet.com/collection/update

Update collection by creating a request with one or more optional parameter. There are three parameters that can be used to update collection inscriptions. The inscriptions parameter can be used to add and remove inscriptions. When given, it is considered the new state of the collection inscriptions. The new_inscriptions parameter can be used to add new inscriptions with metadata. The new_inscription_ids parameter can be used to add new inscriptions without metadata. These three parameters are meant to be used separately.

Request Body
Name	Type	Description
api_secret*

String

slug*

String

unique collection slug

name

String

human readable name of the collection

icon_inscription_id

String

inscription id of the icon of the collection (priority)

icon

String

url of the inscription icon

active

bool

to show/hide the collection

description

String

inscriptions

Inscription[]

List of inscriptions in the collection

socials

Json

{ "twitter": "", "discord": "", "website": ""  }

remove_icon_inscription_id

bool

Delete icon_inscription_id

new_inscription_ids

String[]

List of new inscription ids to add to the collection

new_inscriptions

Inscription[]

List of new inscriptions to add to the collection

