#include <bits/stdc++.h>
using namespace std;

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    int t;
    cin >> t;
    while (t--)
    {
        int gear;
        cin >> gear;
        vector<int> arr(gear);
        for (int i = 0; i < gear; i++)
        {
            cin >> arr[i];
        }

        unordered_map<int, int> freq;
        for (int x : arr) freq[x]++;

        bool has_pair = false;
        for (auto &p : freq)
        {
            if (p.second >= 2)
            {
                has_pair = true;
                break;
            }
        }

        if (has_pair)
            cout << "YES\n";
        else
            cout << "NO\n";
    }
}
